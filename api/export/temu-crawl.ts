// api/export/temu-crawl.ts
import { requireAuth } from '../_lib/auth';
import { Workbook } from '../_lib/excel';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { badRequest, serverError } from '../_lib/helpers';
import fs from 'fs';
import path from 'path';

interface CrawledProduct {
  source: string;
  title: string;
  images: string[];
  price?: string;
  url: string;
  description?: string;
}

interface Variant {
  option1: string;
  option2: string;
  price: number;
}

function colLetterToIndex(col: string) {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + col.charCodeAt(i) - 64;
  }
  return index;
}

function indexToColLetter(index: number): string {
  let result = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    index = Math.floor((index - 1) / 26);
  }
  return result;
}

function loadCategoryIndex(temuCategoryId: string) {
  const indexPath = path.join(process.cwd(), 'templates', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const category = index.find((c: any) => c.categoryId === temuCategoryId);
  if (!category) return null;

  const categoryIndexPath = path.join(process.cwd(), 'templates', temuCategoryId, 'index.json');
  if (fs.existsSync(categoryIndexPath)) {
    const categoryIndex = JSON.parse(fs.readFileSync(categoryIndexPath, 'utf8'));
    return { ...category, ...categoryIndex };
  }
  return category;
}

function loadConfig(temuCategoryId: string, type: string) {
  const configPath = path.join(process.cwd(), 'templates', temuCategoryId, `${type.toLowerCase()}.json`);
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const {
      crawledProduct,
      temuCategoryId,
      configType = 'CUSTOM',
      skuPrefix = 'CG',
      customVariants,
      customDescription,
    } = req.body || {};

    if (!crawledProduct) {
      return badRequest(res, 'crawledProduct is required');
    }

    if (!temuCategoryId) {
      return badRequest(res, 'temuCategoryId is required');
    }

    const product = crawledProduct as CrawledProduct;
    const variants = customVariants as Variant[];

    if (!variants || variants.length === 0) {
      return badRequest(res, 'variants are required');
    }

    // Load Temu config
    const categoryIndex = loadCategoryIndex(temuCategoryId);
    if (!categoryIndex) {
      return badRequest(res, `No template found for temuCategoryId: ${temuCategoryId}`);
    }

    const config = loadConfig(temuCategoryId, configType);
    if (!config) {
      return badRequest(res, `Config type "${configType}" not found`);
    }

    // Load Template XLSX
    const templateXlsx = path.join(process.cwd(), 'templates', temuCategoryId, 'template.xlsx');
    const workbook = new Workbook();
    if (fs.existsSync(templateXlsx)) {
      await workbook.xlsx.readFile(templateXlsx);
    }

    let sheet = workbook.getWorksheet('Template');
    if (!sheet) sheet = workbook.addWorksheet('Template');

    // Remove conditional formatting
    (sheet as any).conditionalFormattings = [];

    // Write data rows
    let rowIndex = config.start_row || 5;
    const productCounter = 1;
    const calculatedBaseSku = `${skuPrefix}${String(productCounter).padStart(6, '0')}`;

    const imageStartCol = config.images?.start_col ? colLetterToIndex(config.images.start_col) : null;
    const imageEndCol = config.images?.end_col ? colLetterToIndex(config.images.end_col) : null;
    const maxImages = Math.min(imageStartCol && imageEndCol ? (imageEndCol - imageStartCol + 1) : 10, 10);

    // Unhide image columns
    if (imageStartCol && imageEndCol) {
      for (let col = imageStartCol; col <= imageEndCol; col++) {
        sheet.getColumn(col).hidden = false;
      }
    }

    const images = product.images || [];
    const productName = product.title || '';
    const description = customDescription || product.description || categoryIndex.description || '';

    let variantCounter = 0;
    for (const variant of variants) {
      const option1 = variant.option1 || '';
      const option2 = variant.option2 || '';
      const price = String(variant.price || '');

      const templateStr = JSON.stringify(config.fixed_columns);
      const templateUsesOption2 = templateStr.includes('{option2}');

      let finalOption1 = option1;
      let finalOption2 = option2;

      if (!templateUsesOption2 && !option1 && option2) {
        finalOption1 = option2;
      }

      const variantCount = variants.length;
      const excelFormulaM = `="${skuPrefix}"&TEXT(ROUNDUP((ROW()-4)/${variantCount},0),"000000")`;
      const excelFormulaN = `=M${rowIndex}&"-"&COUNTIF($M$5:M${rowIndex},M${rowIndex})-1`;
      const sku = `${calculatedBaseSku}-${variantCounter}`;
      variantCounter++;

      const row = sheet.getRow(rowIndex);

      // Apply fixed columns
      const placeholders: Record<string, string> = {
        '{product_name}': productName,
        '{product_description}': description,
        '{sku}': sku,
        '{option1}': finalOption1,
        '{option2}': finalOption2,
        '{price}': price,
      };

      for (const [col, rawValue] of Object.entries(config.fixed_columns)) {
        let value = String(rawValue);
        for (const [placeholder, val] of Object.entries(placeholders)) {
          value = value.split(placeholder).join(val);
        }
        row.getCell(col).value = value;
      }

      // Write SKU formulas
      row.getCell('M').value = { formula: excelFormulaM, result: calculatedBaseSku };
      row.getCell('N').value = { formula: excelFormulaN, result: sku };

      // Write images
      if (config.images?.start_col) {
        const imgSlice = images.slice(0, maxImages);
        const startColIndex = colLetterToIndex(config.images.start_col);
        for (let i = 0; i < imgSlice.length; i++) {
          const img = imgSlice[i];
          const imgUrl = typeof img === 'string' ? img : (img as any)?.url;
          if (imgUrl) {
            const colLetter = indexToColLetter(startColIndex + i);
            row.getCell(colLetter).value = imgUrl;
          }
        }
      }

      rowIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `temu-crawl-${temuCategoryId}-${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('Export error:', err);
    return serverError(res, err);
  }
}

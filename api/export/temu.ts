import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { prisma } from '../_lib/prisma.js';
import { requireAuth } from '../_lib/auth.js';
import { badRequest, serverError } from '../_lib/helpers.js';
import { Workbook } from '../_lib/excel.js';

const TEMPLATES_DIR = process.cwd() + '/templates';

function colLetterToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index;
}

function loadCategoryIndex(temuCategoryId: string) {
  const indexPath = path.join(TEMPLATES_DIR, temuCategoryId, 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

function loadConfig(temuCategoryId: string, configType: string) {
  const configPath = path.join(TEMPLATES_DIR, temuCategoryId, `${configType.toLowerCase()}.json`);
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const {
      productIds,
      categoryId,         // DB category ID (for filtering products)
      temuCategoryId,     // Temu category ID (e.g., "10585" for Mugs)
      configType = 'CUSTOM',
      customVariants,     // Optional: user-uploaded variants array
    } = req.body || {};

    console.log('[Temu Export] Request body:', JSON.stringify({
      productIds: productIds?.length,
      categoryId,
      temuCategoryId,
      configType,
      customVariantsCount: customVariants?.length || 0,
      customVariants: customVariants?.slice(0, 2) // Log first 2 variants
    }));

    if (!temuCategoryId) {
      return badRequest(res, 'temuCategoryId is required (e.g., "10585" for Mugs)');
    }

    if (!productIds && !categoryId) {
      return badRequest(res, 'productIds or categoryId is required');
    }

    // Load Temu config
    const categoryIndex = loadCategoryIndex(temuCategoryId);
    if (!categoryIndex) {
      return badRequest(res, `No template found for temuCategoryId: ${temuCategoryId}`);
    }

    const config = loadConfig(temuCategoryId, configType);
    if (!config) {
      return badRequest(res, `Config type "${configType}" not found for category ${temuCategoryId}. Available: ${categoryIndex.availableConfigs?.join(', ')}`);
    }

    // Use custom variants if provided, otherwise use template variants
    const useCustom = customVariants && Array.isArray(customVariants) && customVariants.length > 0;
    const variants: any[] = useCustom
      ? customVariants
      : (categoryIndex.variants || []);

    console.log(`[Temu Export] Using ${useCustom ? 'CUSTOM' : 'TEMPLATE'} variants: ${variants.length} variants`);

    if (variants.length === 0) {
      return badRequest(res, `No variants defined. Upload a JSON file or check template for temuCategoryId: ${temuCategoryId}`);
    }

    // Fetch products from DB
    const whereClause: any = { teamId: auth.teamId };
    if (categoryId) whereClause.categoryId = categoryId;
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      return badRequest(res, 'No products found');
    }

    // Load template xlsx for headers
    const templateXlsx = path.join(TEMPLATES_DIR, temuCategoryId, 'template.xlsx');
    const workbook = new Workbook();
    if (fs.existsSync(templateXlsx)) {
      await workbook.xlsx.readFile(templateXlsx);
    }

    let sheet = workbook.getWorksheet('Template');
    if (!sheet) sheet = workbook.addWorksheet('Template');

    // Remove conditional formatting (causes ExcelJS write errors)
    (sheet as any).conditionalFormattings = [];

    // Remove non-Template sheets
    workbook.eachSheet((s: any, id: number) => {
      if (s.name !== 'Template') workbook.removeWorksheet(id);
    });

    // Write data rows starting from row 5
    let rowIndex = config.start_row || 5;
    const imageStartCol = config.images?.start_col
      ? colLetterToIndex(config.images.start_col)
      : null;
    const imageEndCol = config.images?.end_col
      ? colLetterToIndex(config.images.end_col)
      : null;
    const maxImages = imageStartCol && imageEndCol ? (imageEndCol - imageStartCol + 1) : 20;

    for (const product of products) {
      const images = Array.isArray(product.images) ? product.images as any[] : [];
      const productName = product.listingTitle || product.title || 'Untitled';
      const description = product.description || '';
      const baseSku = (product.title || product.id)
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()
        .slice(0, 20);

      for (const variant of variants) {
        const option1 = variant.option1 || '';
        const option2 = variant.option2 || '';
        const price = String(variant.price || '');
        const slugOption = `${option1}-${option2}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/-$/, '');
        const sku = `${baseSku}-${slugOption}`;

        const row = sheet.getRow(rowIndex);

        // Apply fixed columns - replace {placeholder} values
        for (const [col, rawValue] of Object.entries(config.fixed_columns)) {
          let value = String(rawValue)
            .replace('{product_name}', productName)
            .replace('{product_description}', description)
            .replace('{sku}', sku)
            .replace('{option1}', option1)
            .replace('{option2}', option2)
            .replace('{price}', price);
          row.getCell(col).value = value;
        }

        // Write all product images starting from images.start_col
        if (imageStartCol) {
          const imgSlice = images.slice(0, maxImages);
          for (let i = 0; i < imgSlice.length; i++) {
            const img = imgSlice[i];
            if (img?.url) {
              row.getCell(imageStartCol + i).value = img.url;
            }
          }
        }

        rowIndex++;
      }
    }

    // Debug mode
    if (req.query?.debug === '1') {
      return res.status(200).json({
        productCount: products.length,
        totalRows: rowIndex - (config.start_row || 5),
        temuCategoryId,
        configType,
        variantCount: variants.length,
        imageStartCol: config.images?.start_col,
        imageEndCol: config.images?.end_col,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `temu-${categoryIndex.productName || temuCategoryId}-${configType.toLowerCase()}-${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('Export error:', err);
    return serverError(res, err);
  }
}

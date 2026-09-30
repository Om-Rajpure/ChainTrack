import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { productQuerySchema } from "@/lib/validation";
import { normalizeAddress } from "@/lib/chain";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Query products with pagination, category filter, status filter, and keyword search.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams: Record<string, unknown> = {
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    if (searchParams.get("category")) queryParams.category = searchParams.get("category");
    if (searchParams.get("status")) queryParams.status = searchParams.get("status");
    if (searchParams.get("search")) queryParams.search = searchParams.get("search");
    if (searchParams.get("owner")) queryParams.owner = searchParams.get("owner");
    if (searchParams.get("manufacturer")) queryParams.manufacturer = searchParams.get("manufacturer");

    const validated = productQuerySchema.parse(queryParams);

    const where: any = {
      isConfirmed: true, // By default list confirmed products
    };

    if (validated.category) {
      where.category = { equals: validated.category, mode: "insensitive" };
    }

    if (validated.status) {
      where.currentStatus = validated.status;
    }

    if (validated.manufacturer) {
      where.manufacturerAddress = normalizeAddress(validated.manufacturer);
    }

    if (validated.owner) {
      where.currentOwner = normalizeAddress(validated.owner);
    }

    if (validated.search) {
      const s = validated.search;
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { serialNumber: { contains: s, mode: "insensitive" } },
        { batchNumber: { contains: s, mode: "insensitive" } },
        { category: { contains: s, mode: "insensitive" } },
      ];
    }

    const skip = (validated.page - 1) * validated.limit;
    const take = validated.limit;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / validated.limit);

    return apiSuccess({
      products,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

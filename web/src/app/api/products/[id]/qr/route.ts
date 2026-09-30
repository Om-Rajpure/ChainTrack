import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getChainProduct } from "@/lib/chain";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const numericId = parseInt(params.id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: { code: "INVALID_ID", message: "Product ID must be a positive integer" } },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify/${numericId}`;

    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      type: "png",
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": `inline; filename="chaintrack-qr-${numericId}.png"`,
      },
    });
  } catch (err) {
    console.error("QR Generation error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate QR code" } },
      { status: 500 }
    );
  }
}

import { promises as fs } from "node:fs"
import path from "node:path"

import { NextResponse } from "next/server"

const imagesDirectory = path.join(process.cwd(), "questions", "images")

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageName: string }> },
) {
  const { imageName } = await context.params
  const sanitizedName = path.basename(imageName)

  if (sanitizedName !== imageName) {
    return new NextResponse("Invalid image path", { status: 400 })
  }

  const extension = path.extname(sanitizedName).toLowerCase()
  const contentType = mimeTypes[extension]

  if (!contentType) {
    return new NextResponse("Unsupported image type", { status: 415 })
  }

  const filePath = path.join(imagesDirectory, sanitizedName)

  try {
    const fileBuffer = await fs.readFile(filePath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    })
  } catch {
    return new NextResponse("Image not found", { status: 404 })
  }
}

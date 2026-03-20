package com.yashwanth.ai_exam_system.service;

import com.google.zxing.*;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

@Service
public class QrCodeService {

    public byte[] generateQRCode(String text) {
        return generateQRCode(text, 200, 200);
    }

    public byte[] generateQRCode(String text, int width, int height) {
        try {
            QRCodeWriter writer = new QRCodeWriter();

            BitMatrix matrix = writer.encode(
                    text,
                    BarcodeFormat.QR_CODE,
                    width,
                    height
            );

            // Convert BitMatrix to BufferedImage (NO javase dependency needed)
            BufferedImage image = toBufferedImage(matrix);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", outputStream);

            return outputStream.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("QR Code generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Custom method to convert BitMatrix → BufferedImage
     * (Removes dependency on MatrixToImageWriter)
     */
    private BufferedImage toBufferedImage(BitMatrix matrix) {
        int width = matrix.getWidth();
        int height = matrix.getHeight();

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);

        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            }
        }

        return image;
    }
}
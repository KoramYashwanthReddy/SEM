package com.yashwanth.ai_exam_system;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

public class ExamCodeBenchmarkTest {

    private static final char[] HEX_CHARS = "0123456789ABCDEF".toCharArray();

    // Baseline implementation of String generation
    private String baselineGenerateString() {
        return "EXAM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }

    // Optimized implementation of String generation
    private String optimizedGenerateString() {
        long msb = UUID.randomUUID().getMostSignificantBits();
        char[] buf = new char[17];
        buf[0] = 'E';
        buf[1] = 'X';
        buf[2] = 'A';
        buf[3] = 'M';
        buf[4] = '-';
        for (int i = 0; i < 12; i++) {
            buf[5 + i] = HEX_CHARS[(int) ((msb >>> (60 - i * 4)) & 0x0F)];
        }
        return new String(buf);
    }

    @Test
    void testFormatEquivalence() {
        String code1 = baselineGenerateString();
        String code2 = optimizedGenerateString();

        assertThat(code1).matches("^EXAM-[0-9A-F]{12}$");
        assertThat(code2).matches("^EXAM-[0-9A-F]{12}$");
        assertThat(code1.length()).isEqualTo(17);
        assertThat(code2.length()).isEqualTo(17);
    }

    @Test
    void benchmarkStringGeneration() {
        int iterations = 500_000;

        // Warmup
        for (int i = 0; i < 50_000; i++) {
            baselineGenerateString();
            optimizedGenerateString();
        }

        // Baseline measurement
        long startBaseline = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            baselineGenerateString();
        }
        long baselineDuration = System.nanoTime() - startBaseline;

        // Optimized measurement
        long startOptimized = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            optimizedGenerateString();
        }
        long optimizedDuration = System.nanoTime() - startOptimized;

        double baselineMs = baselineDuration / 1_000_000.0;
        double optimizedMs = optimizedDuration / 1_000_000.0;
        double speedup = (double) baselineDuration / optimizedDuration;

        System.out.println("=== EXAM CODE GENERATION BENCHMARK RESULTS ===");
        System.out.println(String.format("Iterations: %d", iterations));
        System.out.println(String.format("Baseline String Generation: %.2f ms", baselineMs));
        System.out.println(String.format("Optimized String Generation: %.2f ms", optimizedMs));
        System.out.println(String.format("Speedup: %.2fx", speedup));
        System.out.println("===============================================");

        assertThat(optimizedDuration).isLessThan(baselineDuration);
    }
}

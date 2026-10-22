import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Os testes de integração compartilham um banco; rodar um arquivo por vez evita um limpar os dados do outro.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});

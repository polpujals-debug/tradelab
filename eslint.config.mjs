import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Les captures ja es serveixen optimitzades (WebP + miniatura) des de Supabase Storage.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "lib/supabase/database.types.ts", "mcp-server/**"]),
]);

export default eslintConfig;

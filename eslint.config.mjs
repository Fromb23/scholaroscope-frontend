import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    plugins: {
      boundaries,
    },

    settings: {
      "boundaries/elements": [
        // ─────────────────────────────
        // UI (pure presentation)
        // ─────────────────────────────
        { type: "ui", pattern: "app/components/ui/**" },

        // ─────────────────────────────
        // Core kernel
        // ─────────────────────────────
        { type: "core", pattern: "app/core/**" },

        // ─────────────────────────────
        // Plugins (isolated domains)
        // ─────────────────────────────
        { type: "plugin-cbc", pattern: "app/plugins/cbc/**" },
        { type: "plugin-projects", pattern: "app/plugins/projects/**" },
        { type: "plugin-requests", pattern: "app/plugins/requests/**" },
        { type: "plugin-schemes", pattern: "app/plugins/schemes/**" },
        { type: "plugin-platform", pattern: "app/plugins/platform/**" },

        // ─────────────────────────────
        // Pages (composition layer)
        // ─────────────────────────────
        { type: "pages", pattern: "app/(dashboard)/**" },
        { type: "pages", pattern: "app/(auth)/**" },
        { type: "pages", pattern: "app/page.tsx" },

        // ─────────────────────────────
        // Shared (lightweight utilities)
        // ─────────────────────────────
        { type: "shared", pattern: "app/utils/**" },
        { type: "shared", pattern: "app/context/**" },
        { type: "shared", pattern: "app/types/**" },
      ],
    },

    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // ─────────────────────────────
            // UI must stay pure
            // ─────────────────────────────
            {
              from: "ui",
              allow: ["ui"],
            },

            // ─────────────────────────────
            // Core kernel
            // Core must NEVER depend on plugins
            // ─────────────────────────────
            {
              from: "core",
              allow: ["core", "ui", "shared"],
            },

            // ─────────────────────────────
            // Plugin isolation rules
            // Each plugin may depend on:
            // - itself
            // - core
            // - ui
            // - shared
            // But NEVER other plugins
            // ─────────────────────────────
            {
              from: "plugin-cbc",
              allow: ["plugin-cbc", "core", "ui", "shared"],
            },
            {
              from: "plugin-projects",
              allow: ["plugin-projects", "core", "ui", "shared"],
            },
            {
              from: "plugin-requests",
              allow: ["plugin-requests", "core", "ui", "shared"],
            },
            {
              from: "plugin-schemes",
              allow: ["plugin-schemes", "core", "ui", "shared"],
            },
            {
              from: "plugin-platform",
              allow: ["plugin-platform", "core", "ui", "shared"],
            },

            // ─────────────────────────────
            // Pages are composition layer
            // ─────────────────────────────
            {
              from: "pages",
              allow: [
                "pages",
                "plugin-cbc",
                "plugin-projects",
                "plugin-requests",
                "plugin-schemes",
                "plugin-platform",
                "core",
                "ui",
                "shared",
              ],
            },

            // ─────────────────────────────
            // Shared must stay lightweight
            // ─────────────────────────────
            {
              from: "shared",
              allow: ["shared", "ui"],
            },
          ],
        },
      ],
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
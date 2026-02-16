import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: "esm",
	platform: "node",
	outDir: "dist",
	dts: false,
});

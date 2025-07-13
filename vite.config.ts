import { defineConfig } from "vite";
import { execSync } from "child_process";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const getGitCommitSha = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch (error) {
    console.warn("Could not get git commit SHA:", error);
    return "unknown";
  }
};

export default defineConfig({
  server: {
    port: 3000,
  },
  define: {
    __GIT_COMMIT_SHA__: JSON.stringify(getGitCommitSha()),
  },
  envPrefix: ["VITE_", "GOODREADS_"],
  plugins: [
    tailwindcss(),
    // Enables Vite to resolve imports using path aliases.
    tsconfigPaths(),
    tanstackStart({
      tsr: {
        // Specifies the directory TanStack Router uses for your routes.
        routesDirectory: "src/app", // Defaults to "src/routes"
      },
      target: "vercel",
    }),
  ],
});

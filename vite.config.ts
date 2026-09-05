import { defineConfig } from "vite";
import { execSync } from "child_process";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

const getGitCommitSha = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch (error) {
    console.warn("Could not get git commit SHA:", error);
    return "unknown";
  }
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  define: {
    __GIT_COMMIT_SHA__: JSON.stringify(getGitCommitSha()),
  },
  envPrefix: ["VITE_", "GOODREADS_"],
  plugins: [
    tanstackStart({
      router: {
        // Specifies the directory TanStack Router uses for your routes.
        routesDirectory: "app", // Relative to the default srcDirectory ("src")
      },
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
});

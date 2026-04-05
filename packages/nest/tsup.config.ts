import { createPackageBuildConfig } from "../../tooling/tsup.base";

export default createPackageBuildConfig({
  external: ["@nestjs/common", "@nestjs/core", "reflect-metadata", "rxjs"]
});

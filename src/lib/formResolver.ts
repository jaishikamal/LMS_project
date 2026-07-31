import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

/**
 * Zod 4 implements the Standard Schema spec, so we resolve through
 * `standardSchemaResolver` rather than `@hookform/resolvers/zod`. The zod
 * entry point reaches into `zod/v4/core`, which drags `node:module` into the
 * browser bundle and fails the Turbopack build.
 */
export const zodFormResolver = standardSchemaResolver;

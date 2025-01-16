import { z } from "zod";
import { cosmosTransferParamsSchema } from "./schema";

export type CosmosTransferParams = z.infer<typeof cosmosTransferParamsSchema>;

import { Buffer } from "buffer";
import parser from "./parser";

export function decodeResponse(res: any) {
  const response = parser(Buffer.from(res.data));
  delete response.operation;
  return response;
}



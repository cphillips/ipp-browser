import { extend } from "./ipputil";
import { serializer } from "./serializer";
import { OperationDescription } from "./types";

class Printer {
  url: URL | any;
  version: string | any;
  uri: string | any;
  charset: string | any;
  language: string | any;

  constructor(url: any, opts?: any) {
    if (!(this instanceof Printer)) return new Printer(url, opts);
    opts = opts || {};
    this.url = typeof url === "string" ? new URL(url) : url;
    this.version = opts.version || "2.0";
    this.uri = opts.uri || "ipp://" + this.url.host + this.url.pathname;
    this.charset = opts.charset || "utf-8";
    this.language = opts.language || "en-us";
  }

  private _message(operation: string, msg: any) {
    if (typeof operation === "undefined") operation = "Get-Printer-Attributes";

    const base: any = {
      version: this.version,
      operation: operation,
      id: null, // will get added by serializer if one isn't given
      "operation-attributes-tag": {
        // these are required to be in this order
        "attributes-charset": this.charset,
        "attributes-natural-language": this.language,
        "printer-uri": this.uri,
      },
    };

    if (msg && msg["operation-attributes-tag"]["job-id"])
      base["operation-attributes-tag"]["job-id"] =
        msg["operation-attributes-tag"]["job-id"];
    else if (msg && msg["operation-attributes-tag"]["job-uri"])
      base["operation-attributes-tag"]["job-uri"] =
        msg["operation-attributes-tag"]["job-uri"];

    msg = extend(base, msg);
    if (msg["operation-attributes-tag"]["job-uri"])
      delete msg["operation-attributes-tag"]["printer-uri"];
    return msg;
  }

  getHeaders(headers?: any) {
    let defaultHeaders = { ...headers, "Content-Type": "application/ipp" };
    return defaultHeaders;
  }

  encodeMsg(operation: OperationDescription, msg: any) {
    msg = this._message(operation, msg);
    const buf = serializer(msg);
    console.log(buf);
    return buf;
  }
}

export default Printer;

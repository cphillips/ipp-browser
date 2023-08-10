import { xref } from "./ipputil";

let baseVersions:any = [];
baseVersions[0x0100] = '1.0';
baseVersions[0x0101] = '1.1';
baseVersions[0x0200] = '2.0';
baseVersions[0x0201] = '2.1';


export const version = xref(baseVersions)


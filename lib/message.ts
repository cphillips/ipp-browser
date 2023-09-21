import { tags } from "./tags";
import { Buffer } from "buffer";


function msg(host:any, operation:any, id: any){
	let buf =  Buffer.alloc(1024);
	let position = 0;
	function write1(val: number){
		buf.writeUInt8(val, position);
		position+=1;
	}
	function write2(val: number){
		buf.writeUInt16BE(val, position);
		position+=2;
	}
	function write4(val: number){
		buf.writeUInt32BE(val, position);
		position+=4;
	}
	function write(str: any){
		let length = Buffer.byteLength(str);
		write2(length);
		buf.write(str, position, length);
		position+=length;
	}
	function attr(tag: any, name: string, values: string | any[]){
		write1(tag);
		write(name);
		for(let i=0;i<values.length;i++){
			write(values[i]);
		}
	}
	//http://tools.ietf.org/html/rfc2910#section-3.1.1
	//	-----------------------------------------------
	//	|                  version-number             |   2 bytes  - required
	//	-----------------------------------------------
	//	|               operation-id (request)        |
	//	|                      or                     |   2 bytes  - required
	//	|               status-code (response)        |
	//	-----------------------------------------------
	//	|                   request-id                |   4 bytes  - required
	//	-----------------------------------------------
	//	|                 attribute-group             |   n bytes - 0 or more
	//	-----------------------------------------------
	//	|              end-of-attributes-tag          |   1 byte   - required
	//	-----------------------------------------------
	//	|                     data                    |   q bytes  - optional
	//	-----------------------------------------------

	write2(0x0200);//version 2.0
	write2(operation);
	write4(id);//request-id

	//the required stuff...
	write1(tags['operation-attributes-tag']);//0x01
	attr(tags.charset, 'attributes-charset', ['utf-8']);
	attr(tags.naturalLanguage, 'attributes-natural-language', ['en-us']);
	attr(tags.uri, 'printer-uri', ['ipp://'+host]);

	write1(0x03);//end
	return buf.slice(0, position);
}

export default msg;
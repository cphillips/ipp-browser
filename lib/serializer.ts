import { Buffer } from "buffer";
import attributes from "./attributes";
import enums from "./enums";
import keywords from "./keywords";
import { status } from "./status-codes";
import { tags } from "./tags";
import { version } from "./versions";

let operations = enums["operations-supported"],
  RS = "\u001e";
function random() {
  return +Math.random().toString().substr(-8);
}

export function serializer(msg: any) {
  let buf = Buffer.alloc(10240);
  let position = 0;
  function write1(val: any) {
    checkBufferSize(1);
    buf.writeUInt8(val, position);
    position += 1;
  }
  function write2(val: any) {
    checkBufferSize(2);
    buf.writeUInt16BE(val, position);
    position += 2;
  }
  function write4(val: any) {
    checkBufferSize(4);
    buf.writeUInt32BE(val, position);
    position += 4;
  }
  function writeStr(str: any, enc?: any) {
    let length = Buffer.byteLength(str);
    checkBufferSize(length);
    buf.write(str, position, length, enc || "utf8");
    position += length;
  }
  function write(str: any, enc?: any) {
    let length = Buffer.byteLength(str);
    write2(length);
    checkBufferSize(length);
    buf.write(str, position, length, enc || "utf8");
    position += length;
  }
  function checkBufferSize(length: any) {
    if (position + length > buf.length) {
      buf = Buffer.concat([buf], 2 * buf.length);
    }
  }
  let special: any = {
    "attributes-charset": 1,
    "attributes-natural-language": 2,
  };
  let groupmap: any = {
    "job-attributes-tag": ["Job Template", "Job Description"],
    "operation-attributes-tag": "Operation",
    "printer-attributes-tag": "Printer Description",
    "unsupported-attributes-tag": "", //??
    "subscription-attributes-tag": "Subscription Description",
    "event-notification-attributes-tag": "Event Notifications",
    "resource-attributes-tag": "", //??
    "document-attributes-tag": "Document Description",
  };
  function writeGroup(tag: any) {
    let attrs = msg[tag];
    if (!attrs) return;
    let keys = Object.keys(attrs);
    //'attributes-charset' and 'attributes-natural-language' need to come first- so we sort them to the front
    if (tag == tags["operation-attributes-tag"])
      keys = keys.sort(function (a, b) {
        return (special[a] || 3) - (special[b] || 3);
      });
    let groupname = groupmap[tag];
    write1(tags[tag]);
    keys.forEach(function (name) {
      attr(groupname, name, attrs);
    });
  }
  function attr(group: any, name: any, obj: any) {
    let groupName = Array.isArray(group)
      ? group.find(function (grp) {
          return attributes[grp][name];
        })
      : group;
    if (!groupName) throw "Unknown attribute: " + name;

    let syntax = attributes[groupName][name];

    //if(!syntax) throw "Unknown attribute: " + name;

    let value = obj[name];
    if (!Array.isArray(value)) value = [value];

    value.forEach(function (value: any, i: any) {
      //we need to re-evaluate the alternates every time
      let syntax2 = Array.isArray(syntax)
        ? resolveAlternates(syntax, name, value)
        : syntax;
      let tag = getTag(syntax2, name, value);
      if (tag === tags.enum) value = enums[name][value];

      write1(tag);
      if (i == 0) {
        write(name);
      } else {
        write2(0x0000); //empty name
      }

      writeValue(tag, value, syntax2.members);
    });
  }
  function getTag(syntax: any, name: any, value: any) {
    let tag = syntax.tag;
    if (!tag) {
      let hasRS = !!~value.indexOf(RS);
      tag = tags[syntax.type + (hasRS ? "With" : "Without") + "Language"];
    }
    return tag;
  }
  function resolveAlternates(array: any, name: any, value: any) {
    switch (array.alts) {
      case "keyword,name":
      case "keyword,name,novalue":
        if (value === null && array.lookup["novalue"])
          return array.lookup["novalue"];
        return ~keywords[name].indexOf(value)
          ? array.lookup.keyword
          : array.lookup.name;
      case "integer,rangeOfInteger":
        return Array.isArray(value)
          ? array.lookup.rangeOfInteger
          : array.lookup.integer;
      case "dateTime,novalue":
        return !isNaN(Date.parse(value))
          ? array.lookup.dateTime
          : array.lookup["novalue"];
      case "integer,novalue":
        return !isNaN(value) ? array.lookup.integer : array.lookup["novalue"];
      case "name,novalue":
        return value !== null ? array.lookup.name : array.lookup["novalue"];
      case "novalue,uri":
        return value !== null ? array.lookup.uri : array.lookup["novalue"];
      case "enumeration,unknown":
        return enums[name][value]
          ? array.lookup["enumeration"]
          : array.lookup.unknown;
      case "enumeration,novalue":
        return value !== null
          ? array.lookup["enumeration"]
          : array.lookup["novalue"];
      case "collection,novalue":
        return value !== null
          ? array.lookup["enumeration"]
          : array.lookup["novalue"];
      default:
      //throw "Unknown atlernates";
    }
  }
  function writeValue(tag: any, value: any, submembers?: any) {
    switch (tag) {
      case tags.enum:
        write2(0x0004);
        return write4(value);
      case tags.integer:
        write2(0x0004);
        return write4(value);

      case tags.boolean:
        write2(0x0001);
        return write1(Number(value));

      case tags.rangeOfInteger:
        write2(0x0008);
        write4(value.min);
        write4(value.max);
        return;

      case tags.resolution:
        write2(0x0009);
        write4(value[0]);
        write4(value[1]);
        write1(value[2] === "dpi" ? 0x03 : 0x04);
        return;

      case tags.dateTime:
        write2(0x000b);
        write2(value.getFullYear());
        write1(value.getMonth() + 1);
        write1(value.getDate());
        write1(value.getHours());
        write1(value.getMinutes());
        write1(value.getSeconds());
        write1(Math.floor(value.getMilliseconds() / 100));
        let tz = timezone(value);
        writeStr(tz[0]); // + or -
        write1(tz[1]); //hours
        write1(tz[2]); //minutes
        return;

      // case tags.textWithLanguage:
      //  case tags.nameWithLanguage:
      // 	write2(parts[0].length);
      // 	write2(parts[0]);
      // 	write2(parts[1].length);
      // 	write2(parts[1]);
      // 	return;

      case tags.nameWithoutLanguage:
      case tags.textWithoutLanguage:
      case tags.octetString:
      case tags.memberAttrName:
        return write(value);

      case tags.keyword:
      case tags.uri:
      case tags.uriScheme:
      case tags.charset:
      case tags.naturalLanguage:
      case tags.mimeMediaType:
        return write(value, "ascii");

      case tags.begCollection:
        write2(0); //empty value
        return writeCollection(value, submembers);

      case tags["no-value"]:
        //empty value? I can't find where this is defined in any spec
        return write2(0);

      default: return write2(0)
        //debugger;
        //return write2(0);
        //return write2(value);
      // crash
      // console.error(tag, "not handled");
    }
  }
  function writeCollection(value: any, members: any) {
    Object.keys(value).forEach(function (key) {
      let subvalue = value[key];
      let subsyntax = members[key];

      if (Array.isArray(subsyntax))
        subsyntax = resolveAlternates(subsyntax, key, subvalue);

      let tag = getTag(subsyntax, key, subvalue);
      if (tag === tags.enum) subvalue = enums[key][subvalue];

      write1(tags.memberAttrName);
      write2(0); //empty name
      writeValue(tags.memberAttrName, key);
      write1(tag);
      write2(0); //empty name
      writeValue(tag, subvalue, subsyntax.members);
    });
    write1(tags.endCollection);
    write2(0); //empty name
    write2(0); //empty value
  }

  write2(version[msg.version || "2.0"]);
  write2(msg.operation ? operations[msg.operation] : status[msg.statusCode]);
  write4(msg.id || random()); //request-id

  writeGroup("operation-attributes-tag");
  writeGroup("job-attributes-tag");
  writeGroup("printer-attributes-tag");
  writeGroup("document-attributes-tag");
  //TODO... add the others

  write1(0x03); //end

  if (!msg.data) return buf.slice(0, position);

  if (!Buffer.isBuffer(msg.data)) throw "data must be a Buffer";

  let buf2 = Buffer.alloc(position + msg.data.length);
  buf.copy(buf2, 0, 0, position);
  msg.data.copy(buf2, position, 0);
  return buf2;
}
function timezone(d: any) {
  let z = d.getTimezoneOffset();
  return [z > 0 ? "-" : "+", ~~(Math.abs(z) / 60), Math.abs(z) % 60];
}

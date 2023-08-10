//  To serialize and deserialize, we need to be able to look
//  things up by key or by value. This little helper just
//  converts the arrays to objects and tacks on a 'lookup' property.
export function xref(arr: any) {
  let obj: any = {};
  arr.forEach(function (item: any, index: any) {
    obj[item] = index;
  });
  obj.lookup = arr;
  return obj;
}

export function extend(destination: any, source: any) {
  for (let property in source) {
    if (source[property] && source[property].constructor === Object) {
      destination[property] = destination[property] || {};
      extend(destination[property], source[property]);
    } else {
      destination[property] = source[property];
    }
  }
  return destination;
}

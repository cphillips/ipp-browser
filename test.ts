
import axios from 'axios'
import PDFDocument from 'pdfkit'
import concat from 'concat-stream'
import Printer from './lib/printer'

var doc = new PDFDocument({ margin: 5 });

doc.pipe(concat(function (data: any) {

    let url = "http://192.168.4.62:631/ipp/print"
    let printer = new Printer(url);
    let msg = {
        "operation-attributes-tag": {
            "document-format": "application/pdf",
        },
        data: data,
    };




    axios
        .post(url, printer.encodeMsg("Print-Job", msg), {
            responseType:"arraybuffer",
            headers: printer.getHeaders(),
        })
        .then((response:any) => {
            console.log(printer.decodeMsg(response.data))
        });


}))

doc.text('Hello World',20,20)

doc.end()



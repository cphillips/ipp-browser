
import axios from 'axios';
import Buffer from 'buffer'
import PDFDocument from 'pdfkit'
import concat from 'concat-stream'
import Printer from './lib/main'

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
            headers: printer.getHeaders(),
        })
        .then((response) => {
            console.log(response)
        });


}))

doc.text('Hello World',20,20)

doc.end()



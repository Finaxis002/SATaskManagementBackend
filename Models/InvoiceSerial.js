const mongoose = require('mongoose')

const InvoiceSerialSchema = new mongoose.Schema({
    key:{
        type : String ,
        require: true,
        unique : true,
    },
    lastSerial:{
        type : Number,
        default : 0,
    }
}, {timeseries : true})

module.exports = mongoose.model("InvoiceSerial", InvoiceSerialSchema)
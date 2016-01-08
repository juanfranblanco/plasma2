
class FastParser {
    
    static fixed_data(b, len, buffer) {
        if (!b) { return } ;
        if (buffer) {
            var data = buffer.slice(0, len).toString('binary');
            b.append(data, 'binary');
            while (len-- > data.length) {
                b.writeUint8(0);
            }
            return;
        } else {
            var b_copy;
            b_copy = b.copy(b.offset, b.offset + len), b.skip(len);
            return new Buffer(b_copy.toBinary(), 'binary');
        }
    }
        
    static ripemd160(b, ripemd160) {
        if (!b) { return; }
        if (ripemd160) {
            FastParser.fixed_data(b, 20, ripemd160);
            return;
        } else {
            return FastParser.fixed_data(b, 20);
        }
    }
    
    static time_point_sec(b, epoch) {
        if (epoch) {
            epoch = Math.ceil(epoch / 1000);
            b.writeInt32(epoch);
            return;
        } else {
            epoch = b.readInt32(); // fc::time_point_sec
            return new Date(epoch * 1000);
        }
    }
}
    
module.exports = FastParser;

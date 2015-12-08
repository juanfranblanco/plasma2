import { Aes, PrivateKey, PublicKey} from ".."
import assert from "assert"

/**
*/
describe("AES", function() {
    
    var encrypted_key = 
        "37fd6a251d262ec4c25343016a024a3aec543b7a43a208bf66bc80640dff" +
        "8ac8d52ae4ad7500d067c90f26189f9ee6050a13c087d430d24b88e713f1" + 
        "5d32cbd59e61b0e69c75da93f43aabb11039d06f";
    
    var decrypted_key = 
        "ab0cb9a14ecaa3078bfee11ca0420ea2" + 
        "3f5d49d7a7c97f7f45c3a520106491f8" + // 64 hex digits 
        "00000000000000000000000000000000000000000000000000000000" + 
        "00000000";
    
    it("Decrypt", function() {
        var aes = Aes.fromSeed("Password01")
        var d = aes.decryptHex(encrypted_key)
        return assert.equal(decrypted_key, d, "decrypted key does not match")
    })
    
    it("Encrypt", function() {
        var aes = Aes.fromSeed("Password01")
        var d = aes.encryptHex(decrypted_key)
        return assert.equal(encrypted_key, d, "encrypted key does not match")
    })
    
    /*it "Computes public key", ->
        private_key = PrivateKey.fromHex decrypted_key.substring 0, 64
        public_key = private_key.toPublicKey()
        console.log public_key.toHex());*/
})
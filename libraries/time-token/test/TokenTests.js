import {createToken, checkToken} from '../index'
import assert from "assert"

describe('rsa-token', () => {
    it('seeded_token', done => {
        let token = createToken("seed")
        assert.equal(19, token.length)
        let result = checkToken(token)
        assert.equal(true, result.valid)
        assert.equal("seed", result.seed)
        assert.equal(null, result.error)
        done()
    })
    it('non_seeded_token', done => {
        let token = createToken("seed", false)
        assert.equal(14, token.length)
        let result = checkToken(token, "seed")
        assert.equal(true, result.valid)
        assert.equal("seed", result.seed)
        assert.equal(null, result.error)
        done()
    })
    it('invalid_tokens', done => {
        let token = createToken("seed")
        let result = checkToken(token+'.')
        assert.equal(false, result.valid)
        assert.equal(null, result.seed)
        assert.equal('unmatched', result.error)
        
        result = checkToken('a'+token)
        assert.equal(false, result.valid)
        assert.equal(null, result.seed)
        assert.equal('unmatched', result.error)
        
        result = checkToken('a'+token.substring(1))
        assert.equal(false, result.valid)
        assert.equal(null, result.seed)
        assert.equal('unmatched', result.error)
        done()
    })
    it('expired_token', done => {
        let old_expire = process.env.npm_config_gph_expire_in_min
        try {
            process.env.npm_config_gph_expire_in_min = 0
            let token = createToken("seed")
            let result = checkToken(token)
            assert.equal(false, result.valid)
            assert.equal(null, result.seed)
            assert.equal("expired", result.error)
        } finally {
            process.env.npm_config_gph_expire_in_min = old_expire
            done()
        }
    })
    it('non_expired_token', done => {
        let old_expire = process.env.npm_config_gph_expire_in_min
        try {
            process.env.npm_config_gph_expire_in_min = 1
            let token = createToken("seed")
            let result = checkToken(token)
            assert.equal(true, result.valid)
            assert.equal("seed", result.seed)
            assert.equal(null, result.error)
        } finally {
            process.env.npm_config_gph_expire_in_min = old_expire
            done()
        }
    })
})
import { Apis } from "@graphene/chain"


describe("API", () => {

    it("Login", ()=> {
        return Apis.instance("ws://localhost:8090").init_promise
    })
    

})
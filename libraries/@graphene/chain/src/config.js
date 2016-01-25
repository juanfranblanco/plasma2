var _this;

module.exports = _this = {
    core_asset: "CORE",
    address_prefix: "GPH",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    depositWithdrawDefaultActiveTab: 0,
    networks: {
        BitShares: {
            core_asset: "BTS",
            address_prefix: "BTS",
            chain_id: "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8"
        },
        Muse: {
            core_asset: "MUSE",
            address_prefix: "MUSE",
            chain_id: "45ad2d3f9ef92a49b55c2227eb06123f613bb35dd08bd876f2aea21925a67a67"
        }
    },
    
    /** Set a few properties for known chain IDs. */
    setChainId: function(chain_id) {
        
        var i, len, network, network_name, ref;
        ref = Object.keys(_this.networks);
        
        for (i = 0, len = ref.length; i < len; i++) {
            
            network_name = ref[i];
            network = _this.networks[network_name];
            
            if (network.chain_id === chain_id) {
                
                _this.network_name = network_name;
                
                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                }
                
                console.log("Configured for", network_name, network);
                break;
            }
        }
        
        if (!_this.network_name) {
            console.log("Unknown chain id", chain_id);
        }
        
    }
}

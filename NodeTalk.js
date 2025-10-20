function NodeTalk() {
    this.userNode = bbs.node_num;
    this.currentUser = new User(bbs.node_useron);
    this.telefish = this.currentUser.curxtrn; // For ref, this is currently telefish but may change
    this.nodesOnline = [];
}

NodeTalk.prototype.probeNode = function(node) {
    var targetNode = new User(node);
    if (targetNode.curxtrn === this.telefish) {
        return true;
    } else {
        return false;
    }
};

NodeTalk.prototype.addNode = function(node) {
    this.nodesOnline.push(node);
};

// Ask all nodes to discover themselves, including self
NodeTalk.prototype.broadcastDiscover = function() {
    for (var i = 0; i < system.nodes; i++) {
        if (this.probeNode(i) && !this.checkDuplicateNode(i)) {
            system.put_node_message(i, "\x1bTF\x1b" + this.userNode + "\x1b" + "\x7fDISCOVER\x7f");
        }
    }
};

NodeTalk.prototype.checkDuplicateNode = function(node) {
    for (var i = 0; i < this.nodesOnline.length; i++) {
        if (parseInt(node) === parseInt(this.nodesOnline[i])) {
            return true;
        }
    }
    return false;
};

// Acknowledge the node that sent the discover message, not including self or already acknowledged nodes
NodeTalk.prototype.broadcastAcknowledge = function(node) {
    if (this.checkDuplicateNode(node)) {
        return;
    }
    system.put_node_message(node, "\x1bTF\x1b" + this.userNode + "\x1b" + "\x7fDISCOVER\x7f");
};

NodeTalk.prototype.sendMessage = function(message, name) {
    for (var i = 0; i < this.nodesOnline.length; i++) {
        system.put_node_message(this.nodesOnline[i], "\x1bTF\x1b" + name + "\x1b" + message);
    }
};

/* Leave as last line for convenient load() usage: */
NodeTalk;

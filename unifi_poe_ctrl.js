module.exports = function (RED) {
    function UnifiPoeCtrl(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            var cmd = [];
            if(msg.payload.cmd == "reboot"){
                cmd = ["telnet localhost 23", "enable", "configure", "interface 0/" + msg.payload.interface, "poe opmode shutdown", "exit", "exit", "exit", "exit", "sleep 2", "telnet localhost 23", "enable", "configure", "interface 0/8", "poe opmode auto", "exit", "exit", "exit", "exit", "exit"];
            }
            else if(msg.payload.cmd == "shutdown"){
                cmd = ["telnet localhost 23", "enable", "configure", "interface 0/" + msg.payload.interface, "poe opmode shutdown", "exit", "exit", "exit", "exit", "exit"];
            }
            else if(msg.payload.cmd == "auto"){
                cmd = ["telnet localhost 23", "enable", "configure", "interface 0/" + msg.payload.interface, "poe opmode auto", "exit", "exit", "exit", "exit", "exit"];
            }
            else if(msg.payload.cmd == "mac-addr-table"){
                cmd = ["telnet localhost 23", "enable", "show mac-addr-table", "exit", "exit", "exit", "exit"];
            }
            else if(msg.payload.cmd == "poe_status"){
                cmd = ["telnet localhost 23", "enable", "show poe status 0/" + msg.payload.interface || 1, "exit", "exit", "exit", "exit"];
            }
            else if(msg.payload.cmd == "switch_temp"){
                cmd = ["swctrl env show"];
            }
            else if(msg.payload.cmd == "all"){
                cmd = ["swctrl env show", "telnet localhost 23", "enable", "show poe status all", "exit", "exit", "exit"];
            }
            //host configuration with connection settings and commands
            var host = {
                server: {
                    host: msg.payload.host ? msg.payload.host : "127.0.0.1",
                    port: msg.payload.port ? msg.payload.port : 22,
                    userName: msg.payload.username ? msg.payload.username : "ubnt",
                    password: msg.payload.password ? msg.payload.password : "ubnt",
                },
                commands: cmd
            };
            var SSH2Shell = require('ssh2shell'),
                //Create a new instance passing in the host object
                SSH = new SSH2Shell(host),
                //Use a callback function to process the full session text
                callback = function (sessionText) {
                    if(msg.payload.cmd == "status")
                    {
                        const startstr = "--------------";
                        const stopstr = "(UBNT) #";
                        var startpos = sessionText.lastIndexOf(startstr) + startstr.length;
                        var stoppos = sessionText.lastIndexOf(stopstr);
                        var status = sessionText.substring(startpos,stoppos).replace(/\r\n/g, "").replace(/\n/g, "").trim().split(/\s+/);
                        msg.payload.status = {};
                        msg.payload.status.interface = status[0];
                        msg.payload.status.detection = status[1];
                        msg.payload.status.class = status[2];
                        msg.payload.status.consumed_W = status[3];
                        msg.payload.status.volage = status[4];
                        msg.payload.status.current_mA = status[5];
                    }
                    else if(msg.payload.cmd == "mac-addr-table"){
                        const startstr = "--------------";
                        const stopstr = "(UBNT) #";
                        var startpos = sessionText.lastIndexOf(startstr) + startstr.length;
                        var stoppos = sessionText.lastIndexOf(stopstr);
                        var status = sessionText.substring(startpos,stoppos).replace(/\r\n/g, "").replace(/\n/g, "").trim().split(/\s+/);
                        msg.payload.raw_data = status;
                    }
                    else if(msg.payload.cmd == "switch_temp"){
                        const startstr = "General Temperature (C):";
                        const stopstr = "Temp Sensor";
                        var startpos = sessionText.lastIndexOf(startstr) + startstr.length;
                        var stoppos = sessionText.lastIndexOf(stopstr);
                        var status = sessionText.substring(startpos,stoppos).replace(/\r\n/g, "").replace(/\n/g, "").trim().split(/\s+/);
                        msg.payload.switch_temp = parseFloat(status[0]);
                    }
                    msg.payload.response = sessionText;
                    node.send(msg);
                }
            //Start the process
            SSH.connect(callback);
        });
    }
    RED.nodes.registerType("unifi_poe_ctrl", UnifiPoeCtrl);
}
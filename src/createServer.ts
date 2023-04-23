import Resource from "./Resource";

function createServer(config: DefOptions) {

  class Server extends Resource{
    protected static options = config
  }
  return Server
}
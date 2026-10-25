class Asset {
  static fromModule(module) {
    return new Asset(module);
  }
  constructor(module) {
    this.module = module;
    this.uri = typeof module === "string" ? module : "mock-asset-uri";
    this.localUri = this.uri;
  }
  async downloadAsync() {
    return this;
  }
}

module.exports = { Asset };

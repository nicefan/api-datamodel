declare const uniRequest: {
    name: 'uni';
    request(requestConfig: Record<string,any>): Promise<any>;
};
export default uniRequest;

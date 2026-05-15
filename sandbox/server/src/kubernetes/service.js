import k8sApi from "./config.js";

export async function createService(sandboxId) {

    const serviceManifest = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                app: 'sandbox',
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                app: 'sandbox',
                sandboxId: sandboxId
            },
            ports: [
                {
                    name: 'http',
                    port: 80,
                    targetPort: 5173,
                    protocol: 'TCP'
                },
                {
                    name: 'http-agent',
                    port: 3000,
                    targetPort: 3000,
                    protocol: 'TCP'
                }
            ],
            type: 'ClusterIP'
        }
    };

    const response = await k8sApi.createNamespacedService({
        namespace: 'default',
        body: serviceManifest
    });
    return response;
}

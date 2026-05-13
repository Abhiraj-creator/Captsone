import k8sApi from "./config.js";

export async function createPod(sandboxId) {

    const podManifest = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                app: 'sandbox',
                sandboxId: sandboxId
            }
        },
        spec: { 
            containers: [
                {
                    name: 'sandbox-container', 
                    image:'template:latest',
                    imagePullPolicy: 'IfNotPresent',
                    ports: [{ containerPort: 5173,name:'http' }],
                    resources: {
                        limits: {
                            cpu: '500m',
                            memory: '256Mi'
                        },
                        requests: {
                            cpu: '250m',
                            memory: '128Mi'
                        }
                    }
                }
            ]
        }
    };
                  
    const response = await k8sApi.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    }
    );
    return response;
}
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
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: 'template',
                    imagePullPolicy: 'IfNotPresent',
                    command: ['sh', '-c', 'cp -r /workspace/. /seed/'],
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/seed'
                        }
                    ],

                }
            ],
            containers: [
                {
                    name: 'sandbox-container',
                    image: 'template',
                    imagePullPolicy: 'IfNotPresent',
                    ports: [{ containerPort: 5173, name: 'http' }],
                    resources: {
                        limits: {
                            cpu: '500m',
                            memory: '256Mi'
                        },
                        requests: {
                            cpu: '250m',
                            memory: '128Mi'
                        }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    name: 'agent-container',
                    image: 'agent',
                    imagePullPolicy: 'IfNotPresent',
                    ports: [{ containerPort: 3000, name: 'http' }],
                    resources: {
                        limits: {
                            cpu: '500m',
                            memory: '256Mi'
                        },
                        requests: {
                            cpu: '250m',
                            memory: '128Mi'
                        }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
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
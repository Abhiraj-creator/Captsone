import k8sApi from "./config.js";

const templateImage = process.env.SANDBOX_TEMPLATE_IMAGE || 'template';
const agentImage = process.env.SANDBOX_AGENT_IMAGE || 'agent';
const imagePullSecrets = process.env.SANDBOX_IMAGE_PULL_SECRET
    ? [{ name: process.env.SANDBOX_IMAGE_PULL_SECRET }]
    : undefined;

export async function createPod(sandboxId) {

    const podManifest = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                sandboxId: sandboxId
            }
        },
        spec: {
            ...(imagePullSecrets && { imagePullSecrets }),
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: templateImage,
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
                    image: templateImage,
                    imagePullPolicy: 'IfNotPresent',
                    ports: [{ containerPort: 5173, name: 'http' }],
                    resources: {
                        limits: {
                            cpu: '250m',
                            memory: '384Mi'
                        },
                        requests: {
                            cpu: '100m',
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
                    image: agentImage,
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

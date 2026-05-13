import * as k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();

try {
    kc.loadFromCluster();
} catch {
    kc.loadFromDefault();
}

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

export default k8sApi;

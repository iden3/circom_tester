pragma circom 2.1.1;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template Arrays(N, M) {
    signal input a[N][M];
    signal input commitment;

    signal tmp[N];

    for (var i = 0; i < N; i++) {
        tmp[i] <== Poseidon(M)(a[i]);
    }

    signal hash <== Poseidon(N)(tmp);
    commitment === hash;
}

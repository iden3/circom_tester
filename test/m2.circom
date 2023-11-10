pragma circom 2.0.0;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;
    signal output vec[10];
    c <== a*b;
    for (var i = 0; i < 10; i++) {
        vec[i] <== a*b;
    }
}

component main = Multiplier2();

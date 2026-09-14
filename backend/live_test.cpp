int matrix_calc(int base, int limit) {
    int total = 0;
    for (int i = 0; i < limit; i++) {
        if (i % 2 == 0) {
            total += base * i;
        } else {
            total -= base + i;
        }
    }
    if (total > 1000) {
        return 1;
    }
    return 0;
}

int main() {
    return matrix_calc(5, 10);
}
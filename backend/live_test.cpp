int analyze_data_stream(int count) {
    // 1. Dead memory array (Triggers SROA & Dead Store Elimination)
    int temporary_cache[4] = {10, 20, 30, 40};
    int unused_metric = 8888;

    int total_score = 0;

    // 2. Loop with conditional branch (Triggers CFG Branching & Loop Optimizations)
    for (int i = 0; i < count; ++i) {
        if (i % 2 == 0) {
            total_score += (i * 2);
        } else {
            total_score += 1;
        }
    }

    // 3. Unreachable branch (Triggers SimplifyCFG pruning)
    if (total_score < -1000) {
        return unused_metric;
    }

    return total_score;
}

int main() {
    // 4. Constant parameter (Triggers InlinerPass & Constant Folding)
    return analyze_data_stream(8);
}
# Step notes

## 1. Wrote tip.py
- Why: the core task, a CLI that takes a bill and a tip percent and prints tip and total.
- What changed: new file tip.py with three functions: money() checks input, calculate_tip() does the math, main() reads the arguments and prints.
- Learned / problems: used Decimal instead of float so cents stay exact (0.1 + 0.2 != 0.3 with floats), and ROUND_HALF_UP because Python's round() uses banker's rounding.

## 2. Ran it and checked edge cases
- Why: prove it works, and that rounding and bad input behave.
- What changed: nothing, testing only.
- Learned / problems: `50 18` gives 9.00 / 59.00. `12.35 15` gives 1.85 / 14.20 (1.8525 rounded half-up). `abc 15` gives a clean argparse error with exit code 2. No bugs found.

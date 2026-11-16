"""Tiny tip calculator.

Usage:
    python tip.py <bill> <tip_percent>

Example:
    python tip.py 50 18   ->  Tip: 9.00, Total: 59.00
"""

import argparse
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

CENTS = Decimal("0.01")


def money(text):
    """Turn a command-line string into a non-negative Decimal, or reject it."""
    try:
        value = Decimal(text)
    except InvalidOperation:
        raise argparse.ArgumentTypeError(f"'{text}' is not a number")
    if not value.is_finite() or value < 0:
        raise argparse.ArgumentTypeError(f"'{text}' must be zero or more")
    return value


def calculate_tip(bill, percent):
    """Return (tip, total), both rounded to cents."""
    tip = (bill * percent / 100).quantize(CENTS, rounding=ROUND_HALF_UP)
    total = (bill + tip).quantize(CENTS, rounding=ROUND_HALF_UP)
    return tip, total


def main():
    parser = argparse.ArgumentParser(description="Work out a tip and the total bill.")
    parser.add_argument("bill", type=money, help="bill amount, e.g. 42.50")
    parser.add_argument("percent", type=money, help="tip percent, e.g. 18")
    args = parser.parse_args()

    tip, total = calculate_tip(args.bill, args.percent)
    print(f"Tip:   {tip}")
    print(f"Total: {total}")


if __name__ == "__main__":
    main()

import pandas as pd
import json
import sys

def main():
    try:
        input_df = pd.read_excel('d:/Projects/Rafiqul Vaiya/Ratio/ratio_test.xlsx')
        print("--- Input Data (first 20 rows) ---")
        print(input_df.head(20).to_string())
    except Exception as e:
        print(f"Error reading input: {e}")

    try:
        output_df = pd.read_excel('d:/Projects/Rafiqul Vaiya/Ratio/stepping(12345).xls')
        print("\n--- Output Data (first 40 rows) ---")
        print(output_df.head(40).to_string())
    except Exception as e:
        print(f"Error reading output: {e}")

if __name__ == "__main__":
    main()

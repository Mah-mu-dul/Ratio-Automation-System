import pandas as pd

def main():
    try:
        file_path = 'd:/Projects/Rafiqul Vaiya/Ratio/stepping(12345).xls'
        xl = pd.ExcelFile(file_path)
        print(f"Sheets in file: {xl.sheet_names}")
        
        for sheet_name in xl.sheet_names:
            df = xl.parse(sheet_name)
            print(f"\n--- Sheet: {sheet_name} ---")
            print(df.head(20).to_string())
            
            # calculate total waste for the sheet
            total_qty = df['Qty'].sum()
            total_waste = df['Waste'].sum()
            if total_qty > 0:
                print(f"Total Qty: {total_qty}, Total Waste: {total_waste}, Overall Waste %: {(total_waste/total_qty)*100:.2f}%")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

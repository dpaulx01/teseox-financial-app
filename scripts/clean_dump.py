#!/usr/bin/env python3
"""Clean MySQL dump file by removing privileged statements"""

import re
import sys

def clean_dump(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f_in:
        with open(output_file, 'w', encoding='utf-8') as f_out:
            for line in f_in:
                # Skip privileged SET statements
                if '@@SESSION.SQL_LOG_BIN' in line:
                    continue
                if '@@GLOBAL.GTID_PURGED' in line:
                    continue

                # Remove DEFINER clauses
                line = re.sub(r'DEFINER\s*=\s*`[^`]+`@`[^`]+`', '', line)

                f_out.write(line)

if __name__ == '__main__':
    input_file = 'database/backups/cloud-to-local/cloud_production_20251116.sql'
    output_file = 'database/backups/cloud-to-local/cloud_production_clean.sql'

    print(f"Cleaning {input_file}...")
    clean_dump(input_file, output_file)
    print(f"Clean file created: {output_file}")

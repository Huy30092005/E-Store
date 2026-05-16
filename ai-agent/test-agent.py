"""
test_agent.py
=============
Interactive terminal REPL for testing the MongoDB AI Agent directly —
no FastAPI server needed.

Usage:
    python test_agent.py                        # use default DB from .env
    python test_agent.py --db sample_store      # override database
    python test_agent.py --db sample_store --schema   # print schema then REPL

Commands inside the REPL:
    <any question>   Ask the agent a natural-language question
    /schema          Show all collections + inferred fields
    /collections     List collection names only
    /db <name>       Switch to a different database
    /help            Show this help
    /quit or Ctrl+C  Exit
"""

import asyncio
import json
import argparse
import sys
import os

# ── make sure we can import agent.py from the same directory ──────────────
sys.path.insert(0, os.path.dirname(__file__))
from agent import MongoAIAgent, DEFAULT_DB

# ── ANSI colours (disabled automatically on Windows if not supported) ─────
RESET  = "\033[0m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
DIM    = "\033[2m"


def c(color: str, text: str) -> str:
    """Wrap text in an ANSI color code."""
    return f"{color}{text}{RESET}"


def print_banner():
    print()
    print(c(CYAN, "╔══════════════════════════════════════════════╗"))
    print(c(CYAN, "║      🍃  MongoDB AI Agent  —  Terminal       ║"))
    print(c(CYAN, "╚══════════════════════════════════════════════╝"))
    print(c(DIM,  "  Type a question, /schema, /help, or /quit"))
    print()


def print_help():
    print(c(YELLOW, "\n  Available commands:"))
    print("   /schema           — Show all collections + inferred fields")
    print("   /collections      — List collection names only")
    print("   /db <name>        — Switch active database")
    print("   /help             — Show this message")
    print("   /quit  (or Ctrl+C)— Exit")
    print(c(DIM, "   Anything else is treated as a question to the agent.\n"))


def print_divider():
    print(c(DIM, "  " + "─" * 54))


def print_result(result: dict):
    print()
    print(c(GREEN, "  ✦ Answer"))
    print_divider()
    # Indent every line of the answer
    for line in result["answer"].splitlines():
        print(f"  {line}")
    print_divider()
    print(c(DIM, f"  Collection : {result['collection']}"))
    print(c(DIM, f"  Database   : {result['database']}"))
    print(c(DIM, f"  Docs found : {result['raw_count']}"))
    # Pretty-print the MQL plan
    plan_str = json.dumps(result["query_used"], indent=4, default=str)
    indented  = "\n".join("  " + l for l in plan_str.splitlines())
    print(c(DIM, f"  MQL used   :\n{indented}"))
    print()


async def print_schema(agent: MongoAIAgent, database: str):
    print(c(YELLOW, f"\n  Schema for database: {database}"))
    print_divider()
    info = await agent.list_collections(database)
    for col in info["collections"]:
        schema_info = await agent.infer_schema(col, database)
        fields = ", ".join(
            f"{k} ({v})" for k, v in schema_info["inferred_schema"].items()
        )
        print(f"  {c(CYAN, col)}")
        print(c(DIM, f"    {fields or '(no documents)'}"))
    print()


async def run_repl(database: str, show_schema_on_start: bool):
    agent = MongoAIAgent()

    print(c(YELLOW, "  Connecting to MongoDB Atlas…"), end=" ", flush=True)
    await agent.connect()
    ok = await agent.ping()
    if not ok:
        print(c(RED, "FAILED"))
        print(c(RED, "  ✗ Could not reach MongoDB. Check MONGODB_URI in .env"))
        return
    print(c(GREEN, "OK"))
    print(c(DIM,   f"  Database : {database}"))
    print(c(DIM,   f"  Model    : {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}"))

    if show_schema_on_start:
        await print_schema(agent, database)

    print_banner()

    try:
        while True:
            try:
                raw = input(c(CYAN, "  You › ")).strip()
            except EOFError:
                break

            if not raw:
                continue

            # ── built-in commands ──────────────────────────────────────
            if raw.lower() in ("/quit", "/exit", "exit", "quit"):
                break

            if raw.lower() == "/help":
                print_help()
                continue

            if raw.lower() == "/collections":
                info = await agent.list_collections(database)
                print(c(YELLOW, f"\n  Collections in '{database}':"))
                for name in info["collections"]:
                    print(f"    • {name}")
                print()
                continue

            if raw.lower() == "/schema":
                await print_schema(agent, database)
                continue

            if raw.lower().startswith("/db "):
                new_db = raw[4:].strip()
                if new_db:
                    database = new_db
                    print(c(GREEN, f"  ✓ Switched to database: {database}\n"))
                else:
                    print(c(RED, "  Usage: /db <database_name>\n"))
                continue

            if raw.startswith("/"):
                print(c(RED, f"  Unknown command: {raw}  (type /help)\n"))
                continue

            # ── natural-language question ──────────────────────────────
            print(c(DIM, "  Thinking..."))
            try:
                result = await agent.ask(question=raw, database=database)
                print_result(result)
            except Exception as exc:
                print(c(RED, f"\n  ✗ Error: {exc}\n"))

    except KeyboardInterrupt:
        pass
    finally:
        await agent.close()
        print(c(DIM, "\n  Goodbye!\n"))


# ── Entry point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Interactive terminal for the MongoDB AI Agent"
    )
    parser.add_argument(
        "--db",
        default=DEFAULT_DB,
        help=f"Database to query (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--schema",
        action="store_true",
        help="Print the full schema on startup before the REPL",
    )
    args = parser.parse_args()

    asyncio.run(run_repl(database=args.db, show_schema_on_start=args.schema))


if __name__ == "__main__":
    main()
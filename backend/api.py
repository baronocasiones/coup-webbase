from fastapi import FastAPI


app = FastAPI()

@app.get("/players")
def get_players():
    pass

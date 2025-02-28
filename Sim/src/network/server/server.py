import socket
import websockets
import asyncio

UDP_PORT = 4000
UDP_HOST = "127.0.0.1"
WS_PORT = 5501

udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

async def handle_client(websocket, path):
    print("User connected via WebSocket")
    try:
        async for message in websocket:
            udp_socket.sendto(message.encode(), (UDP_HOST, UDP_PORT))
            await websocket.send(f"UDP sent: {len(message)} bytes")
    except Exception as e:
        await websocket.send(f"Error: {str(e)}")
    finally:
        print("User disconnected")

start_server = websockets.serve(handle_client, "localhost", WS_PORT)
asyncio.get_event_loop().run_until_complete(start_server)
print(f"WebSocket server on ws://localhost:{WS_PORT}")
asyncio.get_event_loop().run_forever()
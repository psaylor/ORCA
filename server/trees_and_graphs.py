from stacks_and_queues import Queue

class Node:

	def __init__(self, value):
		self.value = value
		self.visited = False

	def __str__(self):
		return '( ' + str(self.value) + ')'

class GraphNode(Node):
	def __init__(self, value, adjacent_nodes = []):
		Node.__init__(self, value)
		self.adjacent = adjacent_nodes

	def add_adjacent(self, node):
		self.adjacent.append(node)
		return self

class BinaryTreeNode(Node):
	def __init__(self, value, left_node=None, right_node=None):
		Node.__init__(self, value)
		self.left_node = left_node
		self.right_node = right_node
		self.height = None

class BinaryTree:

	def __init__(self):
		self.root = None

	def __str__(self):
		return str(self.root.left) + ' <- ' + str(self.root) + ' -> ' + str(self.root.right)

class Graph:

	def __init__(self):
		pass

def DFS(root):
	if (root is None):
		return
	visit(root)
	root.visited = True
	for n in root.adjacent:
		if (n.visited is False):
			DFS(n)

def BFS(root):
	queue = Queue()
	root.visited = True
	visit(root)
	queue.enqueue(root)  # Add to end of queue

	while (not queue.isEmpty()):
		r = queue.dequeue()
		for n in r.adjacent:
			if (n.visited is False):
				visit(n)
				n.visited = True
				queue.enqueue(n)

'''
4.1	Implement a function to check if a binary tree is balanced (balanced tree means the heights of the two subtrees of any node never differ by more than one)
'''
def computeHeight(node):
	if (node is None):
		return -1
	if (node.height is not None):
		return node.height
	left_height = computeHeight(node.left_node)
	right_height = computeHeight(node.right_node)
	height = max(left_height, right_height) + 1
	node.height = height
	return node.height

def isBalanced(binary_tree):
	queue = Queue()
	root = binary_tree.root
	computeHeight(root)


def test_is_balanced():
	t = BinaryTree()
	t.root = BinaryTreeNode(5)
	t.root.left = BinaryTreeNode(3)
	t.root.right = BinaryTreeNode(4)
	t.root.right.left = BinaryTreeNode(2)
	print t

test_is_balanced()
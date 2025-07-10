// Services for API endpoints
import productsData from '../../data/products.json';
import usersData from '../../data/users.json';

export function getProducts() {
	return productsData;
}

export function getUsers() {
	return usersData;
}
